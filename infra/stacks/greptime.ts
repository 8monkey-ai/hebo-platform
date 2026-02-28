// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboVpc from "./network";

const greptimeEks = new eks.Cluster("GreptimeEks", {
  vpcId: heboVpc.id,
  privateSubnetIds: heboVpc.privateSubnets,
  publicSubnetIds: heboVpc.publicSubnets,
  endpointPrivateAccess: true,
  version: "1.31",
  skipDefaultNodeGroup: true,
  createInstanceRole: true,
  createOidcProvider: true,
  authenticationMode: eks.AuthenticationMode.Api,
});

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new eks.ManagedNodeGroup("GreptimeNodes", {
  cluster: greptimeEks,
  nodeRole: greptimeEks.instanceRoles.apply((roles) => roles[0]),
  instanceTypes: ["m7g.small"],
  amiType: "AL2023_ARM_64_STANDARD",
  scalingConfig: { minSize: 1, desiredSize: 1, maxSize: 1 },
});

const ebsCsiRole = new aws.iam.Role("GreptimeEbsCsiRole", {
  assumeRolePolicy: $resolve([
    greptimeEks.oidcProviderArn,
    greptimeEks.oidcProviderUrl,
  ]).apply(([arn, url]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Federated: arn },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: {
              [`${url}:sub`]:
                "system:serviceaccount:kube-system:ebs-csi-controller-sa",
              [`${url}:aud`]: "sts.amazonaws.com",
            },
          },
        },
      ],
    }),
  ),
});

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new aws.iam.RolePolicyAttachment("GreptimeEbsCsiPolicy", {
  role: ebsCsiRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
});

const ebsCsiAddon = new aws.eks.Addon("GreptimeEbsCsiAddon", {
  clusterName: greptimeEks.eksCluster.apply((c) => c.name),
  addonName: "aws-ebs-csi-driver",
  serviceAccountRoleArn: ebsCsiRole.arn,
  resolveConflictsOnCreate: "OVERWRITE",
  resolveConflictsOnUpdate: "OVERWRITE",
});

const k8sProvider = new kubernetes.Provider("GreptimeK8sProvider", {
  kubeconfig: greptimeEks.kubeconfigJson,
});

const gp3StorageClass = new kubernetes.storage.v1.StorageClass(
  "Gp3StorageClass",
  {
    metadata: { name: "gp3" },
    provisioner: "ebs.csi.aws.com",
    parameters: { type: "gp3" },
    reclaimPolicy: "Retain",
    volumeBindingMode: "WaitForFirstConsumer",
    allowVolumeExpansion: true,
  },
  { provider: k8sProvider, dependsOn: [ebsCsiAddon] },
);

const greptimeNs = new kubernetes.core.v1.Namespace(
  "GreptimeNamespace",
  { metadata: { name: "greptime-staging" } },
  { provider: k8sProvider },
);

const greptimeChart = new kubernetes.helm.v4.Chart(
  "GreptimeStandalone",
  {
    chart: "greptimedb-standalone",
    repositoryOpts: {
      repo: "https://greptimeteam.github.io/helm-charts/",
    },
    namespace: "greptime-staging",
    values: {
      persistence: { storageClass: "gp3", size: "50Gi" },
    },
  },
  { provider: k8sProvider, dependsOn: [greptimeNs, gp3StorageClass] },
);

const greptimeNlbService = new kubernetes.core.v1.Service(
  "GreptimeNlbService",
  {
    metadata: {
      name: "greptime-nlb",
      namespace: "greptime-staging",
      annotations: {
        "service.beta.kubernetes.io/aws-load-balancer-internal": "true",
        "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
      },
    },
    spec: {
      type: "LoadBalancer",
      selector: {
        "app.kubernetes.io/instance": "greptimedb-standalone",
        "app.kubernetes.io/name": "greptimedb-standalone",
      },
      ports: [{ name: "http", port: 4000, targetPort: 4000, protocol: "TCP" }],
    },
  },
  { provider: k8sProvider, dependsOn: [greptimeChart] },
);

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new aws.ec2.SecurityGroupRule("GreptimeIngress-4000", {
  type: "ingress",
  fromPort: 4000,
  toPort: 4000,
  protocol: "tcp",
  securityGroupId: greptimeEks.nodeSecurityGroupId,
  cidrBlocks: [heboVpc.nodes.vpc.cidrBlock],
  description: "Allow VPC traffic to Greptime OTLP/HTTP",
});

export const greptimeEndpoint = greptimeNlbService.status.apply(
  (s) => s?.loadBalancer?.ingress?.[0]?.hostname ?? "pending",
);
