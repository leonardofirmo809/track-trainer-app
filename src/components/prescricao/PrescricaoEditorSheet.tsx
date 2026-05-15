import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PrescricaoEditor } from "./PrescricaoEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  planId: string;
  onSaved?: () => void;
}

export function PrescricaoEditorSheet({ open, onOpenChange, studentId, planId, onSaved }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[1200px] overflow-y-auto p-6"
      >
        {open && (
          <PrescricaoEditor
            studentId={studentId}
            planId={planId}
            variant="sheet"
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
