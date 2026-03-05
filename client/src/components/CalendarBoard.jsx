import { useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../calendar.css";

import enUS from "date-fns/locale/en-US";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export default function CalendarBoard({ events, onAddEvent }) {
  const mapped = useMemo(() => {
    return (events || []).map((e) => ({
      id: e._id,
      title: e.title,
      start: new Date(e.start),
      end: new Date(e.end),
    }));
  }, [events]);

  return (
    <div className="calWrap">
      <Calendar
        localizer={localizer}
        events={mapped}
        selectable
        onSelectSlot={(slotInfo) => {
          onAddEvent({
            start: slotInfo.start,
            end: slotInfo.end,
            title: "",
          });
        }}
        style={{ height: 520 }}
      />
      <div className="calHint">
        Tip: click + drag on the calendar to create an event.
      </div>
    </div>
  );
}