import { NextRequest, NextResponse } from 'next/server';

// Mock calendar events for demo - in production, this would use Google Calendar API
const mockCalendarEvents = [
  {
    id: '1',
    title: 'Team Standup',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T09:00:00',
    end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T09:30:00',
  },
  {
    id: '2',
    title: 'Dinner with Sarah',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T19:00:00',
    end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T21:00:00',
  },
  {
    id: '3',
    title: 'Yoga Class',
    start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T18:00:00',
    end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T19:00:00',
  },
];

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  // Handle various date formats
  const today = new Date();
  let targetDate: Date;

  const dateLower = dateStr.toLowerCase();
  if (dateLower === 'today') {
    targetDate = today;
  } else if (dateLower === 'tomorrow') {
    targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (dateLower.includes('day after tomorrow')) {
    targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 2);
  } else {
    // Try to parse as date
    targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      targetDate = today;
    }
  }

  // Parse time (e.g., "7pm", "7:30 PM", "19:00")
  let hours = 19; // Default to 7pm
  let minutes = 0;

  if (timeStr) {
    const timeLower = timeStr.toLowerCase().trim();
    const timeMatch = timeLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3]?.toLowerCase();
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
    }
  }

  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

function checkConflicts(
  events: CalendarEvent[],
  requestedStart: Date,
  durationMinutes: number = 120
): { hasConflict: boolean; conflictingEvent?: CalendarEvent; suggestedTimes?: string[] } {
  const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60 * 1000);

  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Check if there's an overlap
    if (requestedStart < eventEnd && requestedEnd > eventStart) {
      // Find suggested alternative times
      const suggestedTimes: string[] = [];
      const dayStart = new Date(requestedStart);
      dayStart.setHours(17, 0, 0, 0); // Start suggesting from 5pm

      // Try times before and after the conflict
      for (let hour = 17; hour <= 21; hour++) {
        const suggested = new Date(requestedStart);
        suggested.setHours(hour, 0, 0, 0);
        const suggestedEnd = new Date(suggested.getTime() + durationMinutes * 60 * 1000);

        // Check if this time slot is free
        let isFree = true;
        for (const e of events) {
          const eStart = new Date(e.start);
          const eEnd = new Date(e.end);
          if (suggested < eEnd && suggestedEnd > eStart) {
            isFree = false;
            break;
          }
        }

        if (isFree && suggested.getTime() !== requestedStart.getTime()) {
          suggestedTimes.push(
            suggested.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          );
        }
      }

      return {
        hasConflict: true,
        conflictingEvent: event,
        suggestedTimes: suggestedTimes.slice(0, 3),
      };
    }
  }

  return { hasConflict: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, time, duration } = body;

    if (action === 'check_availability') {
      const requestedDateTime = parseDateTime(date || 'tomorrow', time || '7pm');
      const result = checkConflicts(mockCalendarEvents, requestedDateTime, duration || 120);

      if (result.hasConflict) {
        return NextResponse.json({
          available: false,
          conflict: {
            title: result.conflictingEvent?.title,
            start: result.conflictingEvent?.start,
            end: result.conflictingEvent?.end,
          },
          suggestedTimes: result.suggestedTimes,
          requestedTime: requestedDateTime.toISOString(),
        });
      }

      return NextResponse.json({
        available: true,
        requestedTime: requestedDateTime.toISOString(),
      });
    }

    if (action === 'get_events') {
      // Get events for a specific date range
      const startDate = new Date(date || new Date());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const events = mockCalendarEvents.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate >= startDate && eventDate <= endDate;
      });

      return NextResponse.json({ events });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Calendar API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
