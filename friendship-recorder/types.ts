export interface FriendProfile {
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
    birthday?: string;
    metDate: string;
    metLocation?: string;
    relationship: string;
    tags: string[];
    contact: {
        phone?: string;
        wechat?: string;
        email?: string;
        socialMedia?: string;
    };
    notes: string;
    intimacyLevel: number;
    lastContactDate?: string;
    customFields: Record<string, any>;
}

export interface Interaction {
    id: string;
    friendId: string;
    date: string;
    type: InteractionType;
    title: string;
    content: string;
    location?: string;
    mood: number;
    cost?: number;
    tags: string[];
    media?: string[];
}

export type InteractionType =
    | 'meeting'
    | 'chat'
    | 'activity'
    | 'gift'
    | 'call'
    | 'meal'
    | 'travel'
    | 'other';

export interface Reminder {
    id: string;
    type: 'birthday' | 'anniversary' | 'followup' | 'custom';
    title: string;
    targetDate: string;
    friendId?: string;
    interactionId?: string;
    description?: string;
    isRecurring: boolean;
    recurringRule?: string;
    isCompleted: boolean;
    completedDate?: string;
}