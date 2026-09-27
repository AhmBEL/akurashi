export interface HomeTask {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  subject: {
    id: string;
    name: string;
    signatureColor: string;
  } | null;
}
