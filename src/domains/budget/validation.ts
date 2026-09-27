import { z } from "zod";

export const addExpenseFormSchema = z.object({
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0"),
  categoryId: z.string().min(1, "Choisis une catégorie"),
  responsibleId: z.string().nullable(),
  spentOn: z.string().min(1, "Choisis une date"),
  note: z.string().nullable(),
});

export type AddExpenseFormValues = z.infer<typeof addExpenseFormSchema>;
