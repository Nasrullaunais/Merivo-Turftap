export default {
  title: "Staff",
  loading: "Loading staff",
  addTitle: "Add staff",
  phoneLabel: "Phone number",
  phoneInvalid: "Enter a phone number like 077 123 4567",
  roleLabel: "Role",
  submit: "Add",
  added: (phone: string) =>
    `${phone} was added. They'll get a WhatsApp message with the console link.`,
  noName: "Hasn't signed in yet",
};
