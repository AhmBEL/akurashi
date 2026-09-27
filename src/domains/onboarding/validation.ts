import { z } from "zod";

export const createFamilyFormSchema = z.object({
  parentName: z.string().trim().min(1, "Ton prénom est requis"),
  parentBirthDate: z.string().min(1, "Ta date de naissance est requise"),
  paletteKey: z.enum(["sauge", "ardoise", "olive", "prune", "argile", "bleu"]),
  painPoints: z.array(z.string()),
  children: z.array(
    z.object({
      name: z.string().trim().min(1, "Le prénom de l'enfant est requis"),
      birthDate: z.string().min(1, "Date de naissance requise"),
    })
  ),
});

export type CreateFamilyFormValues = z.infer<typeof createFamilyFormSchema>;
