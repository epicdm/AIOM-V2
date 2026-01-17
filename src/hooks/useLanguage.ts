import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { getLanguageFn, setLanguageFn } from "~/components/language-provider";

export function useLanguageQuery() {
  return useSuspenseQuery({
    queryKey: ["language"],
    queryFn: () => getLanguageFn(),
  });
}

export function useSetLanguage() {
  return useMutation({
    mutationFn: setLanguageFn,
  });
}
