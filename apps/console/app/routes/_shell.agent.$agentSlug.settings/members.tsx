import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@hebo/shared-ui/components/AlertDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@hebo/shared-ui/components/Avatar";
import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import {
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
  FormControl,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Select } from "@hebo/shared-ui/components/Select";
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
} from "@hebo/shared-ui/components/Table";

import type { OrgInvitation, OrgMember } from "~console/lib/auth/types";
import { useFormErrorToast } from "~console/lib/errors";
import { inviteSchema } from "~console/routes/_shell.agent.$agentSlug.settings.members/invite-schema";

type MembersSettingsProps = {
  members: OrgMember[];
  invitations: OrgInvitation[];
  isOwner: boolean;
  canManage: boolean;
};

export function MembersSettings({
  members,
  invitations,
  isOwner,
  canManage,
}: MembersSettingsProps) {
  const fetcher = useFetcher<{ intent: string; submission: any }>();
  const [role, setRole] = useState("member");

  const [form, fields] = useForm({
    lastResult: fetcher.state === "idle" ? fetcher.data?.submission : undefined,
    constraint: getZodConstraint(inviteSchema),
  });
  useFormErrorToast(form.allErrors);

  return (
    <div className="flex flex-col gap-4">
      <h2>Members</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {canManage && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const initials = (member.user.name || member.user.email)
              .split(member.user.name ? " " : "@")
              .map((p) => p[0])
              .join("")
              .toUpperCase();
            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-7">
                      <AvatarImage alt={member.user.name || member.user.email} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">{member.user.name || member.user.email}</span>
                      {member.user.name && (
                        <span className="text-xs text-muted-foreground">{member.user.email}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                {canManage && (
                  <TableCell>
                    {isOwner && member.role !== "owner" && (
                      <RemoveMemberButton email={member.user.email} />
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {invitations.map((inv) => {
            const initials = inv.email[0].toUpperCase();
            return (
              <TableRow key={inv.id} className="text-muted-foreground">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span>{inv.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {inv.role}
                    </Badge>
                    <Badge variant="outline">Invited</Badge>
                  </div>
                </TableCell>
                <TableCell>expires {new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center">
                      <CopyButton
                        value={`${window.location.origin}/accept-invitation?id=${encodeURIComponent(inv.id)}`}
                        tooltip="Copy invitation link"
                      />
                      <RevokeInvitationButton invitationId={inv.id} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {canManage && (
        <>
          <h3 className="flex items-center gap-2">
            <UserPlus size={16} />
            Invite Member
          </h3>
          <FormControl
            form={form}
            as={fetcher.Form}
            action="members"
            className="flex items-end gap-3"
          >
            <input type="hidden" name="intent" value="invite" />
            <Field name={fields.email.name} className="flex-1">
              <FieldLabel>Email</FieldLabel>
              <FieldControl>
                <Input type="email" placeholder="colleague@company.com" />
              </FieldControl>
              <FieldError />
            </Field>
            <Field name={fields.role.name} className="w-36">
              <FieldLabel>Role</FieldLabel>
              <input type="hidden" name={fields.role.name} value={role} />
              <Select
                value={role}
                onValueChange={(value) => setRole(value as string)}
                items={[
                  { value: "member", label: "Member" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </Field>
            <Button type="submit" isLoading={fetcher.state !== "idle"}>
              <Mail data-icon="inline-start" />
              Invite
            </Button>
          </FormControl>
        </>
      )}
    </div>
  );
}

function RemoveMemberButton({ email }: { email: string }) {
  const fetcher = useFetcher();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Remove member">
            <Trash2 />
          </Button>
        }
      />
      <AlertDialogContent>
        <fetcher.Form method="post" action="members">
          <input type="hidden" name="intent" value="remove" />
          <input type="hidden" name="email" value={email} />
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>Remove {email} from the organization?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              type="submit"
              isLoading={fetcher.state !== "idle"}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </fetcher.Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const fetcher = useFetcher();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Revoke invitation">
            <Trash2 />
          </Button>
        }
      />
      <AlertDialogContent>
        <fetcher.Form method="post" action="members">
          <input type="hidden" name="intent" value="revoke" />
          <input type="hidden" name="invitationId" value={invitationId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation</AlertDialogTitle>
            <AlertDialogDescription>This invitation will be cancelled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              type="submit"
              isLoading={fetcher.state !== "idle"}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </fetcher.Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
