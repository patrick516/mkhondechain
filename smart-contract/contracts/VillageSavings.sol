// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VillageSavings
 * @notice Manages savings and loans for village savings groups in Malawi.
 *         All backend-initiated transactions go through onlyOwner functions.
 *         Members interact directly only through requestLoan and repayLoan.
 */
contract VillageSavings {

    // ─────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────

    address public owner;

    struct Member {
        uint totalSaved;
        uint loanAmount;
        uint loanDueDate;
    }

    mapping(address => Member) public members;

    // ─────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────

    event Deposited(address indexed member, uint amount);
    event LoanGranted(address indexed member, uint amount, uint dueDate);
    event LoanRepaid(address indexed member, uint amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: caller is not the owner");
        _;
    }

    // ─────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─────────────────────────────────────────────
    // OWNER FUNCTIONS (Backend calls these)
    // ─────────────────────────────────────────────

    /**
     * @notice Deposit savings on behalf of a member via USSD
     * @dev Only the backend (owner) can call this
     * @param member The member's wallet address
     */
    function depositFor(address member) external payable onlyOwner {
        require(msg.value > 0, "Must send ETH to save");
        require(member != address(0), "Invalid member address");
        members[member].totalSaved += msg.value;
        emit Deposited(member, msg.value);
    }

    /**
     * @notice Grant a loan to a member on their behalf via USSD
     * @dev Only the backend (owner) can call this
     * @param member The member's wallet address
     * @param amount Loan amount in Wei
     * @param daysToRepay Repayment period in days
     */
    function requestLoanFor(address member, uint amount, uint daysToRepay) external onlyOwner {
        require(member != address(0), "Invalid member address");
        Member storage m = members[member];
        require(m.loanAmount == 0, "Member must repay existing loan first");
        require(amount <= (m.totalSaved * 80) / 100, "Loan exceeds 80% of savings");
        require(daysToRepay > 0, "Repayment period must be at least 1 day");

        m.loanAmount = amount;
        m.loanDueDate = block.timestamp + (daysToRepay * 1 days);

        payable(member).transfer(amount);
        emit LoanGranted(member, amount, m.loanDueDate);
    }

    /**
     * @notice Repay a loan on behalf of a member via USSD
     * @dev Only the backend (owner) can call this
     * @param member The member's wallet address
     */
    function repayLoanFor(address member) external payable onlyOwner {
        require(member != address(0), "Invalid member address");
        Member storage m = members[member];
        require(m.loanAmount > 0, "No active loan for this member");
        require(msg.value >= m.loanAmount, "Repayment amount is too low");

        uint repaid = m.loanAmount;
        m.loanAmount = 0;
        m.loanDueDate = 0;

        // Return any overpayment to the member
        if (msg.value > repaid) {
            payable(member).transfer(msg.value - repaid);
        }

        emit LoanRepaid(member, repaid);
    }

    /**
     * @notice Transfer contract ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─────────────────────────────────────────────
    // MEMBER DIRECT FUNCTIONS (Optional - if members
    // ever interact with contract directly)
    // ─────────────────────────────────────────────

    /**
     * @notice Request a loan directly (member calls this themselves)
     * @param amount Loan amount in Wei
     * @param daysToRepay Repayment period in days
     */
    function requestLoan(uint amount, uint daysToRepay) external {
        Member storage m = members[msg.sender];
        require(m.loanAmount == 0, "Repay your previous loan first");
        require(amount <= (m.totalSaved * 80) / 100, "Loan exceeds 80% of savings");
        require(daysToRepay > 0, "Repayment period must be at least 1 day");

        m.loanAmount = amount;
        m.loanDueDate = block.timestamp + (daysToRepay * 1 days);

        payable(msg.sender).transfer(amount);
        emit LoanGranted(msg.sender, amount, m.loanDueDate);
    }

    /**
     * @notice Repay a loan directly (member calls this themselves)
     */
    function repayLoan() external payable {
        Member storage m = members[msg.sender];
        require(m.loanAmount > 0, "No active loan");
        require(msg.value >= m.loanAmount, "Repayment amount too low");

        uint repaid = m.loanAmount;
        m.loanAmount = 0;
        m.loanDueDate = 0;

        if (msg.value > repaid) {
            payable(msg.sender).transfer(msg.value - repaid);
        }

        emit LoanRepaid(msg.sender, repaid);
    }

    // ─────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @notice Get a member's savings and loan summary
     * @param member The member's wallet address
     */
    function getBalance(address member) external view returns (
        uint totalSaved,
        uint loanAmount,
        uint loanDueDate,
        uint eligibleToBorrow
    ) {
        Member storage m = members[member];
        totalSaved      = m.totalSaved;
        loanAmount      = m.loanAmount;
        loanDueDate     = m.loanDueDate;
        eligibleToBorrow = loanAmount == 0 ? (totalSaved * 80) / 100 : 0;
    }

    /**
     * @notice Get the total ETH held by this contract
     */
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }
}
