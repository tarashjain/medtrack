export const TAGS = [
  'Vision',
  'Dental',
  'Internal Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Dermatology',
  'Gynecology',
  'Pediatrics',
  'ENT',
  'Urology',
  'Mental Health',
  'Radiology',
  'Primary Care',
] as const;

export type Tag = typeof TAGS[number];

// Color map for each tag
export const TAG_COLORS: Record<string, string> = {
  'Vision':            'bg-sky-50 text-sky-700 border-sky-100',
  'Dental':            'bg-blue-50 text-blue-700 border-blue-100',
  'Internal Medicine': 'bg-violet-50 text-violet-700 border-violet-100',
  'Cardiology':        'bg-red-50 text-red-700 border-red-100',
  'Neurology':         'bg-purple-50 text-purple-700 border-purple-100',
  'Orthopedics':       'bg-orange-50 text-orange-700 border-orange-100',
  'Dermatology':       'bg-pink-50 text-pink-700 border-pink-100',
  'Gynecology':        'bg-rose-50 text-rose-700 border-rose-100',
  'Pediatrics':        'bg-yellow-50 text-yellow-700 border-yellow-100',
  'ENT':               'bg-teal-50 text-teal-700 border-teal-100',
  'Urology':           'bg-cyan-50 text-cyan-700 border-cyan-100',
  'Mental Health':     'bg-indigo-50 text-indigo-700 border-indigo-100',
  'Radiology':         'bg-slate-50 text-slate-700 border-slate-200',
  'Primary Care':      'bg-green-50 text-green-700 border-green-100',
};
