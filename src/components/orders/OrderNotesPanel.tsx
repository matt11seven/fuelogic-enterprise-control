import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ordersApiService from "@/services/orders-api";
import { toast } from "@/hooks/use-toast";

interface OrderNotesPanelProps {
  orderId: number;
  notes: string | null;
  onUpdated: () => void;
}

export function OrderNotesPanel({ orderId, notes, onUpdated }: OrderNotesPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      await ordersApiService.addNote(orderId, newNote.trim());
      setNewNote("");
      toast({ title: "Nota adicionada" });
      onUpdated();
    } catch {
      toast({ title: "Erro ao adicionar nota", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {notes && (
        <pre className="text-xs text-slate-400 bg-slate-800/40 rounded-md p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {notes}
        </pre>
      )}
      <div className="flex gap-2">
        <Textarea
          placeholder="Escrever observação..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1 min-h-[60px] bg-slate-800/50 border-slate-700 text-sm resize-none"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isSaving || !newNote.trim()}
          className="self-end"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
