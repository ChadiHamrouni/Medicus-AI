import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';
import type { MedicalEvent } from '@/hooks/patient/useMedicalEvents';
import { DoctorEvent } from '@/services/doctor/events';

const getCalendarId = async (): Promise<string | null> => {
    if (Platform.OS === 'ios') {
        const defaultCalendar = await Calendar.getDefaultCalendarAsync();
        return defaultCalendar.id;
    }

    // For Android, find a writable calendar (usually a Google calendar)
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writableCalendar = calendars.find(
        (cal) => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER || cal.accessLevel === Calendar.CalendarAccessLevel.CONTRIBUTOR
    );

    return writableCalendar?.id || null;
};

const isDoctorEvent = (event: MedicalEvent | DoctorEvent): event is DoctorEvent => {
    return (event as DoctorEvent).event_date !== undefined;
};

export const addToCalendar = async (event: MedicalEvent | DoctorEvent) => {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your calendar to save this event.');
            return;
        }

        const calendarId = await getCalendarId();

        if (!calendarId) {
            Alert.alert('Error', 'No writable calendar found on this device.');
            return;
        }

        let title, startDate, endDate, location, notes;

        if (isDoctorEvent(event)) {
            // Doctor Event Logic
            title = event.patient_name;
            if (event.event_name) title += ` - ${event.event_name}`;
            else title += ` - ${event.event_type}`;

            const dateStr = event.event_date;
            startDate = new Date(dateStr);

            if (event.event_time) {
                const [hours, minutes] = event.event_time.split(':');
                startDate.setHours(parseInt(hours), parseInt(minutes));
            }

            endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

            location = event.event_location || '';

            notes = `Patient: ${event.patient_name}\n`;
            notes += `Type: ${event.event_type}\n`;
            if (event.event_summary) notes += `\nSummary: ${event.event_summary}`;

            if (event.event_details) {
                notes += '\n\nDetails:\n';
                if (typeof event.event_details === 'string') {
                    notes += event.event_details;
                } else {
                    notes += JSON.stringify(event.event_details, null, 2);
                }
            }

        } else {
            // Patient Medical Event Logic
            title = event.title;
            startDate = new Date(event.date);
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            location = event.location || '';

            notes = `Type: ${event.type}\n`;
            if (event.doctor_name) notes += `Doctor: ${event.doctor_name}\n`;
            if (event.healthcare_provider_name) notes += `Provider: ${event.healthcare_provider_name}\n`;
            if (event.specialty) notes += `Specialty: ${event.specialty}\n`;

            if (event.details) {
                notes += `\nDetails: ${event.details}`;
            }

            if (event.event_details) {
                notes += '\n\nAdditional Details:\n';
                if (typeof event.event_details === 'string') {
                    notes += event.event_details;
                } else {
                    notes += JSON.stringify(event.event_details, null, 2);
                }
            }
        }

        await Calendar.createEventAsync(calendarId, {
            title,
            startDate,
            endDate,
            timeZone: 'GMT',
            location,
            notes: notes.trim(),
        });

        Alert.alert('Success', 'Event added to your calendar!');

    } catch (error) {
        console.error('Error adding to calendar:', error);
        Alert.alert('Error', 'Failed to add event to calendar.');
    }
};
