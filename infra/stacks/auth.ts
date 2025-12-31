import heboCluster from "./cluster";
import heboDatabase from "./db";
import { authSecrets, otelSecrets, isProd } from "./env";

const authDomain = isProd ? "auth.hebo.ai" : `auth.${$app.stage}.hebo.ai`;
const authPort = "3000";

const heboAuth = new sst.aws.Service("HeboAuth", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProd ? "1 vCPU" : "0.25 vCPU",
  memory: isProd ? "2 GB" : "0.5 GB",
  link: [heboDatabase, ...authSecrets, ...otelSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.auth",
    tags: [authDomain],
  },
  environment: {
    IS_REMOTE: $dev ? "false" : "true",
    AUTH_URL: `https://${authDomain}`,
    LOG_LEVEL: isProd ? "info" : "debug",
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: authPort,
  },
  loadBalancer: {
    domain: authDomain,
    rules: [
      { listen: "80/http", redirect: "443/https" },
      { listen: "443/https", forward: `${authPort}/http` },
    ],
  },
  scaling: {
    min: isProd ? 2 : 1,
    max: isProd ? 4 : 1,
  },
  capacity: isProd ? undefined : "spot",
  wait: isProd,
});

export default heboAuth;
