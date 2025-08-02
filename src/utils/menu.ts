export const types = [
  { text: 'มื้อเช้า', value: 'breakfast' },
  { text: 'ของว่างเช้า', value: 'breakfastSnack' },
  { text: 'มื้อกลางวัน', value: 'lunch' },
  { text: 'ของว่างกลางวัน', value: 'lunchSnack' },
  { text: 'มื้อเย็น', value: 'dinner' },
  { text: 'ของว่างเย็น', value: 'dinnerSnack' },
];

export const displayMenu = (menu: string) => {
  const type = types.find((type) => type.value === menu);
  return type?.text || '';
};
