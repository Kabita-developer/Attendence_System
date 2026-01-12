"use client";

import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

type Status = "APPROVED" | "PENDING" | "REJECTED";

export function AttendanceCalendar({
  month,
  byDateStatus,
  onDayClick
}: {
  month: string; // YYYY-MM
  byDateStatus: Record<string, Status>;
  onDayClick?: (dateISO: string) => void;
}) {
  const initialDate = React.useMemo(() => `${month}-01`, [month]);
  const todayISO = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="rounded-lg border bg-card/70 p-3 shadow-glass backdrop-blur-xs">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialDate}
        headerToolbar={{ left: "title", center: "", right: "prev,next" }}
        height="auto"
        dayMaxEvents
        dayCellDidMount={(arg) => {
          const iso = arg.date.toISOString().slice(0, 10);
          const status = byDateStatus[iso];

          // only mark past+today dates as absent (no record)
          const isFuture = iso > todayISO;
          const el = arg.el as HTMLElement;
          el.classList.remove("bg-green-500/10", "bg-yellow-500/10", "bg-red-500/10");

          if (status === "APPROVED") el.classList.add("bg-green-500/10");
          else if (status === "PENDING") el.classList.add("bg-yellow-500/10");
          else if (status === "REJECTED") el.classList.add("bg-red-500/10");
          else if (!isFuture) el.classList.add("bg-red-500/10");
        }}
        dateClick={(arg) => onDayClick?.(arg.dateStr)}
      />
    </div>
  );
}


