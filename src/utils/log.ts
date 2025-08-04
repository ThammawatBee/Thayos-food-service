export const LogTypes = [
  { label: 'Create User', value: 'create_user' },
  { label: 'Update User', value: 'update_user' },
  { label: 'Remove User', value: 'remove_user' },
  { label: 'Create Customer', value: 'create_customer' },
  { label: 'Update Customer', value: 'update_customer' },
  { label: 'Remove Customer', value: 'remove_customer' },
  { label: 'Create Order', value: 'create_order' },
  { label: 'Update Order', value: 'update_order' },
  { label: 'Update Bag', value: 'update_bag' },
  { label: 'Check Box', value: 'check_box' },
  { label: 'Check Bag', value: 'check_bag' },
  { label: 'Update Holiday', value: 'update_holiday' },
];

export const getLogLabel = (type: string) => {
  const logType = LogTypes.find((log) => log.value === type);
  return logType ? logType.label : '';
};
