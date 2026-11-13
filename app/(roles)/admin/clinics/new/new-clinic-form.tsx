"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClinicSchema } from "@/lib/validation";
import { createClinicAction } from "./actions";

type Values = z.input<typeof createClinicSchema>;

function Capability({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="bg-card has-[:checked]:border-primary has-[:checked]:bg-secondary flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary mt-1 size-5"
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground block text-sm">{hint}</span>
      </span>
    </label>
  );
}

export function NewClinicForm() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(createClinicSchema),
    defaultValues: {
      name: "",
      state: "",
      lga: "",
      phone: "",
      email: "",
      contactName: "",
      hasCSection: false,
      hasBlood: false,
    },
  });

  async function onSubmit(values: Values) {
    const result = await createClinicAction(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.inviteSent) toast.success(`Invite sent to ${result.email}`);
    else toast.warning(`${result.clinicName} was created, but the invite email failed.`);
    router.push("/admin");
    router.refresh();
  }

  const text = (
    name: keyof Values,
    label: string,
    props: React.ComponentProps<"input"> = {},
  ) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        aria-invalid={!!errors[name]}
        className="h-12 text-base"
        {...props}
        {...register(name as Exclude<keyof Values, "hasCSection" | "hasBlood">)}
      />
      <FieldError errors={[errors[name]]} />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <FieldGroup>
        {text("name", "Clinic name", { autoFocus: true })}
        <div className="grid gap-5 sm:grid-cols-2">
          {text("state", "State")}
          {text("lga", "LGA")}
        </div>
        {text("phone", "Clinic phone", { type: "tel", placeholder: "0803 123 4567" })}
      </FieldGroup>

      <FieldGroup>
        {text("contactName", "Contact person")}
        {text("email", "Contact email", { type: "email", autoComplete: "off" })}
        <FieldDescription className="-mt-3">
          This email receives the invite and becomes the clinic&apos;s login.
        </FieldDescription>
      </FieldGroup>

      <div className="space-y-3">
        <p className="text-sm font-medium">What can this facility do?</p>
        <Controller
          control={control}
          name="hasCSection"
          render={({ field }) => (
            <Capability
              checked={field.value}
              onChange={field.onChange}
              title="Caesarean section"
              hint="Can perform emergency surgery"
            />
          )}
        />
        <Controller
          control={control}
          name="hasBlood"
          render={({ field }) => (
            <Capability
              checked={field.value}
              onChange={field.onChange}
              title="Blood available"
              hint="Has blood for transfusion"
            />
          )}
        />
      </div>

      <Button type="submit" className="h-12 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create clinic and send invite"}
      </Button>
    </form>
  );
}
