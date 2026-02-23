import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id?: string;
    title: string;
    category: string;
    starts_at: Date;
    ends_at: Date;
    notes: string;
  } | null;
  initialDate?: Date | null;
  onSave: (event: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const EventModal = ({ open, onOpenChange, event, initialDate, onSave, onDelete }: EventModalProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("otros");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const categories = [
    { value: "trabajo", label: t('event.categories.work'), colorClass: "bg-category-work" },
    { value: "deporte", label: t('event.categories.sport'), colorClass: "bg-category-sport" },
    { value: "salud", label: t('event.categories.health'), colorClass: "bg-primary" },
    { value: "estudio", label: t('event.categories.study'), colorClass: "bg-category-study" },
    { value: "otros", label: t('event.categories.other'), colorClass: "bg-secondary" },
  ];

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setCategory(event.category);
      setStartDate(new Date(event.starts_at));
      setEndDate(new Date(event.ends_at));
      setStartTime(format(new Date(event.starts_at), "HH:mm"));
      setEndTime(format(new Date(event.ends_at), "HH:mm"));
      setNotes(event.notes || "");
    } else {
      // Reset form
      setTitle("");
      setCategory("otros");
      const baseDate = initialDate || new Date();
      setStartDate(baseDate);
      setEndDate(baseDate);
      // If initialDate has a specific hour set (not midnight), use it
      const hour = baseDate.getHours();
      const minute = baseDate.getMinutes();
      const hasSpecificTime = hour !== 0 || minute !== 0;
      setStartTime(hasSpecificTime ? format(baseDate, "HH:mm") : "09:00");
      setEndTime(hasSpecificTime ? format(new Date(baseDate.getTime() + 60 * 60 * 1000), "HH:mm") : "10:00");
      setNotes("");
    }
  }, [event, initialDate, open]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('event.errors.titleRequired'));
      return;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const starts_at = new Date(startDate);
    starts_at.setHours(startHour, startMinute, 0, 0);

    const ends_at = new Date(endDate);
    ends_at.setHours(endHour, endMinute, 0, 0);

    if (ends_at <= starts_at) {
      toast.error(t('event.errors.endBeforeStart'));
      return;
    }

    const durationMin = (ends_at.getTime() - starts_at.getTime()) / 60000;
    if (durationMin < 15) {
      toast.error(t('event.errors.minDuration', 'El evento debe durar al menos 15 minutos'));
      return;
    }

    await onSave({
      id: event?.id,
      title: title.trim(),
      category,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      notes: notes.trim(),
    });
  };

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(event.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event?.id ? t('event.editEvent') : t('event.newEvent')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('event.title')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('event.titlePlaceholder')}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t('event.category')}</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={category === cat.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer",
                    category === cat.value && cat.colorClass
                  )}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('event.startDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('event.startTime')}</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('event.endDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('event.endTime')}</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('event.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('event.notesPlaceholder')}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {event?.id && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? t('event.deleting') : t('common.delete')}
              </Button>
            )}
            <Button onClick={handleSave} className="flex-1">
              {event?.id ? t('event.update') : t('event.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
