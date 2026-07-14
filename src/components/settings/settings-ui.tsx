"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useShellUI } from "@/components/shell/shell-ui";
import {
  inviteOperatorAction,
  toggleAlertAction,
  updateMyNameAction,
  updateWorkspaceAction,
} from "@/app/(console)/settings/actions";

const inputCls =
  "rounded-[8px] border border-white/8 bg-field px-3 py-[7px] text-[12.5px] text-fg placeholder:text-faint focus:border-accent/50";

export function WorkspaceForm({
  workspaceName,
  companyName,
  defaultTrialDays,
}: {
  workspaceName: string;
  companyName: string;
  defaultTrialDays: number;
}) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateWorkspaceAction({
        workspaceName: String(fd.get("workspace") ?? ""),
        companyName: String(fd.get("company") ?? ""),
        defaultTrialDays: Number(fd.get("trialDays")) || 14,
      });
      toast(res.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-4 text-[12.5px]">
        <span className="text-muted">Workspace name</span>
        <input name="workspace" defaultValue={workspaceName} className={`${inputCls} w-[260px]`} />
      </label>
      <label className="flex items-center justify-between gap-4 text-[12.5px]">
        <span className="text-muted">Company</span>
        <input name="company" defaultValue={companyName} className={`${inputCls} w-[260px]`} />
      </label>
      <label className="flex items-center justify-between gap-4 text-[12.5px]">
        <span className="text-muted">Default trial length (days)</span>
        <input
          name="trialDays"
          type="number"
          min="1"
          defaultValue={defaultTrialDays}
          className={`${inputCls} w-[100px] font-mono`}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white hover:bg-accent-hi disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save workspace"}
        </button>
      </div>
    </form>
  );
}

export function AlertToggle({
  id,
  name,
  desc,
  initialOn,
}: {
  id: string;
  name: string;
  desc: string;
  initialOn: boolean;
}) {
  const { toast } = useShellUI();
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  const flip = () => {
    const next = !on;
    setOn(next); // optimistic
    startTransition(async () => {
      const res = await toggleAlertAction(id, next);
      if (!res.ok) {
        setOn(!next);
        toast(res.message);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 border-b border-white/4 py-2">
      <div className="flex-1">
        <div className="text-[12.5px] font-medium">{name}</div>
        <div className="mt-px text-[11.5px] text-muted">{desc}</div>
      </div>
      <button
        onClick={flip}
        disabled={pending}
        className={`relative h-[19px] w-[34px] cursor-pointer rounded-[10px] transition-colors ${
          on ? "bg-accent" : "bg-white/12"
        }`}
      >
        <span
          className="absolute top-[2px] h-[15px] w-[15px] rounded-full bg-white transition-[left]"
          style={{ left: on ? 17 : 2 }}
        />
      </button>
    </div>
  );
}

export function EditableSelfName({ initialName }: { initialName: string }) {
  const { toast } = useShellUI();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(initialName);
          setEditing(true);
        }}
        title="Edit your name"
        className="cursor-pointer text-left hover:underline"
      >
        {initialName}
      </button>
    );
  }

  const save = () => {
    const name = value.trim();
    if (!name || name === initialName) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateMyNameAction(name);
      toast(res.message);
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <input
      autoFocus
      disabled={pending}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save();
        } else if (e.key === "Escape") {
          setEditing(false);
        }
      }}
      className="rounded-[6px] border border-accent/40 bg-field px-2 py-[2px] text-[12.5px] text-fg outline-none disabled:opacity-60"
    />
  );
}

export function InviteMemberButton() {
  const { toast } = useShellUI();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await inviteOperatorAction({
        email: String(fd.get("email") ?? ""),
        displayName: String(fd.get("name") ?? ""),
        role: String(fd.get("role") ?? "operator"),
      });
      toast(res.message);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[7px] bg-accent/15 px-[11px] py-1 text-[11.5px] font-semibold text-lav hover:bg-accent/28"
      >
        Invite member
      </button>
      {open && (
        <div
          className="fixed inset-0 z-70 flex justify-center bg-[rgba(6,6,10,.6)] pt-[14vh]"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="h-fit w-[420px] overflow-hidden rounded-[14px] border border-white/10 bg-pop shadow-[0_24px_70px_rgba(0,0,0,.6)]"
          >
            <div className="border-b border-white/6 px-[17px] py-[13px] text-[13px] font-semibold">
              Invite operator
            </div>
            <div className="flex flex-col gap-[10px] p-[17px]">
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@agency.com *"
                className={inputCls}
              />
              <input name="name" placeholder="Display name" className={inputCls} />
              <select name="role" defaultValue="operator" className={inputCls}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <div className="text-[11px] leading-[1.5] text-faint">
                Sends a Supabase Auth invite email when SMTP is configured; if the account already
                exists it is granted operator access directly.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/6 px-[17px] py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg border border-white/10 px-3 py-[6px] text-xs font-medium text-mid hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-lg bg-accent px-3 py-[6px] text-xs font-semibold text-white hover:bg-accent-hi disabled:opacity-60"
              >
                {pending ? "Inviting…" : "Invite"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
