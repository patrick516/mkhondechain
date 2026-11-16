const formatDueDate = (loanDueDate) => {
  if (!loanDueDate || loanDueDate === 0) return "N/A";
  const date = new Date(loanDueDate * 1000);
  return date.toDateString();
};

const PIN_PROMPT = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;

module.exports = { formatDueDate, PIN_PROMPT };
