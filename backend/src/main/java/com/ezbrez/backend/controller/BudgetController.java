package com.ezbrez.backend.controller;

import com.ezbrez.backend.model.Budget;
import com.ezbrez.backend.model.ExpenseItem;
import com.ezbrez.backend.service.BudgetService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@CrossOrigin
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @PostMapping
    public Budget saveBudget(@RequestBody CreateBudgetRequest request) {
        return budgetService.saveBudget(request.userId(), request.monthlyIncome(), request.expenseItems());
    }

    // Get a user's budget as-is (income + expense items, no calculations)
    @GetMapping("/{userId}")
    public Budget getBudget(@PathVariable Long userId) {
        return budgetService.getBudgetByUserId(userId);
    }

    public record CreateBudgetRequest(
            Long userId,
            BigDecimal monthlyIncome,
            List<ExpenseItemRequest> expenseItems
    ) {}

    public record ExpenseItemRequest(
            String name,
            BigDecimal monthlyAmount
    ) {}
}