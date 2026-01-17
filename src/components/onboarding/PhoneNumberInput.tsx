/**
 * Phone Number Input Component
 *
 * A phone number input component with country code selection and formatting.
 * First step in the mobile onboarding flow.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// Common country codes
const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+63", country: "PH", flag: "🇵🇭" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
];

const phoneSchema = z.object({
  countryCode: z.string().min(1, "Country code is required"),
  phoneNumber: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .max(15, "Phone number is too long")
    .regex(/^\d+$/, "Phone number must contain only digits"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

interface PhoneNumberInputProps {
  onSubmit: (fullPhoneNumber: string) => Promise<void>;
  isLoading?: boolean;
  defaultCountryCode?: string;
}

export function PhoneNumberInput({
  onSubmit,
  isLoading = false,
  defaultCountryCode = "+1",
}: PhoneNumberInputProps) {
  const [error, setError] = useState("");

  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      countryCode: defaultCountryCode,
      phoneNumber: "",
    },
  });

  const handleSubmit = async (data: PhoneFormData) => {
    setError("");
    try {
      const fullPhoneNumber = `${data.countryCode}${data.phoneNumber}`;
      await onSubmit(fullPhoneNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 mb-4">
          <Phone className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          Enter your phone number
        </h2>
        <p className="text-muted-foreground">
          We'll send you a verification code to confirm your number
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem className="w-32">
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRY_CODES.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          <span className="flex items-center gap-2">
                            <span>{cc.flag}</span>
                            <span>{cc.code}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormDescription className="text-center">
            Standard SMS rates may apply. We'll never share your number.
          </FormDescription>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
