package com.ezbrez.backend.service;

import com.ezbrez.backend.controller.BudgetController.ExpenseItemRequest;
import com.ezbrez.backend.model.Budget;
import com.ezbrez.backend.model.ExpenseItem;
import com.ezbrez.backend.model.User;
import com.ezbrez.backend.repository.BudgetRepository;
import com.ezbrez.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;

    public BudgetService(BudgetRepository budgetRepository, UserRepository userRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
    }

    // Creates a new budget for this user, OR updates their existing one if present
    public Budget saveBudget(Long userId, BigDecimal monthlyIncome, List<ExpenseItemRequest> expenseItemRequests) {
        Budget budget = budgetRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
                    Budget newBudget = new Budget();
                    newBudget.setUser(user);
                    return newBudget;
                });

        budget.setMonthlyIncome(monthlyIncome);

        // Clear old expense items and replace with new ones
        budget.getExpenseItems().clear();

        List<ExpenseItem> newExpenseItems = expenseItemRequests.stream()
                .map(req -> {
                    ExpenseItem item = new ExpenseItem();
                    item.setName(req.name());
                    item.setMonthlyAmount(req.monthlyAmount());
                    item.setBudget(budget);
                    return item;
                })
                .collect(Collectors.toList());

        budget.getExpenseItems().addAll(newExpenseItems);

        return budgetRepository.save(budget);
    }

    public Budget getBudgetByUserId(Long userId) {
        return budgetRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Budget not found for user id: " + userId));
    }
}