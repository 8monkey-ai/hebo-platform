import { useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import {
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
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

import { authClient } from "~console/lib/auth";
import { shellStore } from "~console/lib/shell";

const inviteSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(["member", "admin"]),
});

type Member = {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  status: string;
};

export function MembersSettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [role, setRole] = useState("member");
  const [isOwner, setIsOwner] = useState(false);

  async function loadData() {
    if (!authClient) return;
    const { data } = await authClient.organization.getFullOrganization();
    if (data) {
      setMembers(data.members as unknown as Member[]);
      setInvitations(
        ((data.invitations ?? []) as unknown as Invitation[]).filter(
          (i) => i.status === "pending",
        ),
      );
      const currentUserId = shellStore.user?.userId;
      const currentMember = (data.members as unknown as Member[]).find(
        (m) => m.userId === currentUserId,
      );
      setIsOwner(currentMember?.role === "owner");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const [form, fields] = useForm({
    constraint: getZodConstraint(inviteSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: inviteSchema });
    },
    async onSubmit(e, { submission }) {
      e.preventDefault();
      if (submission?.status !== "success" || !authClient) return;
      setInviteLoading(true);
      try {
        await authClient.organization.inviteMember({
          email: submission.value.email,
          role: submission.value.role,
        });
        await loadData();
        (e.target as HTMLFormElement).reset();
        setRole("member");
      } finally {
        setInviteLoading(false);
      }
    },
  });

  async function removeMember(memberUserId: string) {
    if (!authClient) return;
    await authClient.organization.removeMember({ memberIdOrEmail: memberUserId });
    await loadData();
  }

  async function cancelInvitation(invitationId: string) {
    if (!authClient) return;
    await authClient.organization.cancelInvitation({ invitationId });
    await loadData();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2>Members</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {isOwner && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.user.name}</TableCell>
              <TableCell>{member.user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{member.role}</Badge>
              </TableCell>
              <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
              {isOwner && (
                <TableCell>
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(member.userId)}
                      aria-label="Remove member"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {isOwner && (
        <>
          <h3 className="flex items-center gap-2">
            <UserPlus size={16} />
            Invite Member
          </h3>
          <form
            id={form.id}
            onSubmit={form.onSubmit}
            className="flex items-end gap-3"
            noValidate
          >
            <Field name={fields.email.name} className="flex-1">
              <FieldLabel>Email</FieldLabel>
              <FieldControl>
                <Input type="email" placeholder="colleague@company.com" />
              </FieldControl>
              <FieldError />
            </Field>
            <Field name={fields.role.name}>
              <FieldLabel>Role</FieldLabel>
              <input type="hidden" name={fields.role.name} value={role} />
              <Select
                value={role}
                onValueChange={setRole}
                items={[
                  { value: "member", label: "Member" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </Field>
            <Button type="submit" isLoading={inviteLoading}>
              <Mail size={14} />
              Invite
            </Button>
          </form>
        </>
      )}

      {invitations.length > 0 && (
        <>
          <h3>Pending Invitations</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                {isOwner && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{inv.role}</Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                  {isOwner && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelInvitation(inv.id)}
                        aria-label="Revoke invitation"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
