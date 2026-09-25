/**
 * LAD Board — Built-in Categories and Default Card Types
 */

import { LADCardTypeDefinition, LADCategoryDefinition } from './card-types';

export const DEFAULT_CATEGORIES: LADCategoryDefinition[] = [
  {
    id: 'finances',
    name: 'Finances',
    icon: 'CreditCard',
    color: 'emerald',
    keywords: [
      'bank', 'banco', 'checking', 'account', 'cuenta', 'balance', 'saldo',
      'invoice', 'factura', 'payment', 'pago', 'money', 'dinero', 'dollar',
      'euro', 'salary', 'transfer', 'credit card', 'tarjeta'
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: 'amber',
    keywords: [
      'buy', 'comprar', 'shopping', 'grocery', 'groceries', 'supermarket',
      'supermercado', 'tienda', 'store', 'cart', 'despensa', 'list', 'lista'
    ],
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'Heart',
    color: 'rose',
    keywords: [
      'doctor', 'médico', 'appointment', 'cita', 'medication', 'medicina',
      'medicación', 'hospital', 'clinic', 'dentist', 'dentista', 'specialist',
      'receta', 'pastilla', 'blood test', 'análisis'
    ],
  },
  {
    id: 'home',
    name: 'Home',
    icon: 'Home',
    color: 'indigo',
    keywords: [
      'home', 'hogar', 'casa', 'repair', 'reparación', 'plumber', 'electrician',
      'cleaning', 'limpieza', 'furniture', 'mueble', 'roof'
    ],
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: 'FileText',
    color: 'blue',
    keywords: [
      'document', 'documento', 'contract', 'contrato', 'passport', 'pasaporte',
      'license', 'licencia', 'id card', 'dni', 'certificate', 'certificado', 'pdf'
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: 'Briefcase',
    color: 'purple',
    keywords: [
      'project', 'proyecto', 'deadline', 'milestone', 'deploy', 'release',
      'feature', 'sprint', 'entrega', 'reunión'
    ],
  },
  {
    id: 'general',
    name: 'General',
    icon: 'Sparkles',
    color: 'slate',
    keywords: ['note', 'nota', 'idea', 'reminder', 'recordatorio', 'task', 'tarea'],
  },
];

export const DEFAULT_CARD_TYPES: LADCardTypeDefinition[] = [
  // 1. Finances -> Account Balance
  {
    id: 'finances.account_balance',
    category: 'finances',
    name: 'Account Balance',
    description: 'Tracks current balance of a checking, savings, or investment account.',
    icon: 'CreditCard',
    isDefault: true,
    isUniqueState: true,
    uniqueKeyFields: ['bank'],
    fields: [
      {
        key: 'bank',
        label: 'Bank / Institution',
        type: 'text',
        required: true,
        placeholder: 'e.g. Bank A, Chase, Santander',
      },
      {
        key: 'account_type',
        label: 'Account Type',
        type: 'select',
        required: true,
        options: ['checking', 'savings', 'credit', 'investment', 'corriente', 'ahorros'],
        defaultValue: 'checking',
      },
      {
        key: 'balance',
        label: 'Balance',
        type: 'currency',
        required: true,
        placeholder: '0.00',
      },
      {
        key: 'comments',
        label: 'Comments',
        type: 'text',
        required: false,
        placeholder: 'Optional notes',
      },
    ],
    nlp: {
      keywords: ['balance', 'saldo', 'account', 'cuenta', 'checking', 'savings', 'corriente', 'ahorros', 'bank', 'banco'],
    },
    titleConfig: {
      mode: 'template',
      template: '{bank} Balance',
    },
    lifecycle: {
      autoArchiveEnabled: true,
      autoArchiveDays: 7,
      hasFollowup: false,
    },
  },

  // 2. Shopping -> Groceries Buying
  {
    id: 'shopping.groceries_buying',
    category: 'shopping',
    name: 'Groceries Buying',
    description: 'Interactive checklist for supermarket and groceries shopping.',
    icon: 'ShoppingBag',
    isDefault: true,
    fields: [
      {
        key: 'title',
        label: 'List Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. Weekly Groceries',
      },
      {
        key: 'checklist',
        label: 'Items',
        type: 'checklist',
        required: true,
        defaultValue: [],
      },
      {
        key: 'estimated_budget',
        label: 'Estimated Budget',
        type: 'currency',
        required: false,
        placeholder: '0.00',
      },
      {
        key: 'due_date',
        label: 'Target Date',
        type: 'date',
        required: false,
      },
      {
        key: 'comments',
        label: 'Comments',
        type: 'text',
        required: false,
        placeholder: 'Optional notes',
      },
    ],
    nlp: {
      keywords: ['groceries', 'supermarket', 'supermercado', 'buy', 'comprar', 'shopping', 'despensa', 'mercado'],
    },
    titleConfig: {
      mode: 'input_text',
    },
    lifecycle: {
      autoArchiveEnabled: true,
      autoArchiveDays: 14,
      hasFollowup: false,
    },
  },

  // 3. Health -> Medical Appointment
  {
    id: 'health.medical_appointment',
    category: 'health',
    name: 'Medical Appointment',
    description: 'Tracks medical visits, indications, outcomes, and follow-up requirements.',
    icon: 'Heart',
    isDefault: true,
    fields: [
      {
        key: 'specialty',
        label: 'Medical Specialty',
        type: 'select',
        required: true,
        allowCustomOption: true,
        options: [
          'General Medicine',
          'Dentistry',
          'Cardiology',
          'Dermatology',
          'Ophthalmology',
          'Pediatrics',
          'Orthopedics',
          'Psychiatry',
          'Medicina General',
          'Dentista',
          'Cardiología',
          'Dermatología',
        ],
        defaultValue: 'General Medicine',
      },
      {
        key: 'patient',
        label: 'Patient',
        type: 'person',
        required: true,
        placeholder: 'e.g. Me, Dad, Carlos',
        defaultValue: 'Me',
      },
      {
        key: 'date',
        label: 'Appointment Date',
        type: 'date',
        required: true,
      },
      {
        key: 'outcome',
        label: 'Doctor Indication / Outcome',
        type: 'text',
        required: false,
        placeholder: 'What the doctor indicated or prescribed',
      },
      {
        key: 'needs_followup',
        label: 'Needs Follow-up?',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'followup_date',
        label: 'Follow-up Date',
        type: 'date',
        required: false,
        conditional: { field: 'needs_followup', operator: 'truthy' },
      },
      {
        key: 'followup_reason',
        label: 'Follow-up Reason / Action',
        type: 'text',
        required: false,
        placeholder: 'Why and what to schedule',
        conditional: { field: 'needs_followup', operator: 'truthy' },
      },
    ],
    nlp: {
      keywords: ['appointment', 'doctor', 'médico', 'dentist', 'dentista', 'cita', 'consulta', 'consulta médica', 'cita médica'],
    },
    titleConfig: {
      mode: 'template',
      template: '{specialty} Appointment',
    },
    lifecycle: {
      hasFollowup: true,
      onItsWayActions: [
        { id: 'scheduled', label: 'Scheduled appointment', actionType: 'schedule', description: 'Selected a date and booked the appointment' },
        { id: 'delegated', label: 'Delegated to someone', actionType: 'delegate', description: 'Assigned someone else to coordinate' },
        { id: 'completed', label: 'Handled / Completed', actionType: 'complete', description: 'Appointment or follow-up is done' },
        { id: 'snoozed', label: 'Need more time / Snooze', actionType: 'snooze', description: 'Postpone reminder for later' },
      ],
    },
  },

  // 4. General -> Note
  {
    id: 'general.note',
    category: 'general',
    name: 'General Note',
    description: 'Quick freeform note or reminder.',
    icon: 'Sparkles',
    isDefault: true,
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'What is on your mind?',
      },
      {
        key: 'comments',
        label: 'Details',
        type: 'text',
        required: false,
        placeholder: 'Additional information',
      },
      {
        key: 'due_date',
        label: 'Due Date',
        type: 'date',
        required: false,
      },
    ],
    nlp: {
      keywords: ['note', 'nota', 'idea', 'remember', 'recordar'],
    },
    titleConfig: {
      mode: 'input_text',
    },
    lifecycle: {
      autoArchiveEnabled: false,
      autoArchiveDays: 14,
      hasFollowup: false,
    },
  },
];
