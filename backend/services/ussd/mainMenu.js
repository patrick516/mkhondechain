function mainMenu(member) {
  return (
    `CON Takulandirani, ${member.firstName}!\n` +
    `Welcome to MkhondeChain\n` +
    `─────────────────\n` +
    `1. Sungani Ndalama / Save\n` +
    `2. Tengani Ngongole / Borrow\n` +
    `3. Bwezerani Ngongole / Repay\n` +
    `4. Onani Ndalama / Balance\n` +
    `5. Nenani Vuto / Report a Problem`
  );
}

module.exports = mainMenu;
