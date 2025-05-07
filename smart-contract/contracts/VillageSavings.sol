

 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VillageSavings {

    struct Member {
        uint totalSaved;
        uint loanAmount;
        uint loanDueDate;
    }

    mapping(address => Member) public members;

    // Save money
   // Add this NEW function to allow backend to deposit on behalf of a user
function depositFor(address member) external payable {
    require(msg.value > 0, "Must send ETH to save");
    members[member].totalSaved += msg.value;
}

    // View balance
  function getBalance(address member) external view returns (
    uint totalSaved,
    uint loanAmount,
    uint loanDueDate,
    uint eligibleToBorrow
) {
    Member storage m = members[member];
    
    totalSaved = m.totalSaved;
    loanAmount = m.loanAmount;
    loanDueDate = m.loanDueDate;

    if (loanAmount == 0) {
        eligibleToBorrow = (totalSaved * 80) / 100;
    } else {
        eligibleToBorrow = 0;
    }
}


    // Request loan
    function requestLoan(uint amount, uint daysToRepay) external {
        Member storage m = members[msg.sender];

        require(m.loanAmount == 0, "Repay your previous loan first");
        require(amount <= (m.totalSaved * 80) / 100, "Loan exceeds 80% of savings");

        m.loanAmount = amount;
        m.loanDueDate = block.timestamp + (daysToRepay * 1 days);

        payable(msg.sender).transfer(amount);
    }

    // Repay loan
    function repayLoan() external payable {
        Member storage m = members[msg.sender];
        require(m.loanAmount > 0, "No active loan");
        require(msg.value >= m.loanAmount, "Repayment amount too low");

        m.loanAmount = 0;
        m.loanDueDate = 0;
    }

    // Contract balance (total ETH saved)
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }
}
