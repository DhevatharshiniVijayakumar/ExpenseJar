package com.expenslar.expenslar.service;

import com.expenslar.expenslar.entity.Budget;
import com.expenslar.expenslar.entity.Category;
import com.expenslar.expenslar.entity.Expense;
import com.expenslar.expenslar.entity.User;
import com.expenslar.expenslar.repository.BudgetRepository;
import com.expenslar.expenslar.repository.CategoryRepository;
import com.expenslar.expenslar.repository.ExpenseRepository;
import com.expenslar.expenslar.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;

    public BudgetService(
            BudgetRepository budgetRepository,
            UserRepository userRepository,
            CategoryRepository categoryRepository,
            ExpenseRepository expenseRepository) {

        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.expenseRepository = expenseRepository;
    }

    public Budget createBudget(
            double amount,
            String month,
            Long userId,
            Long categoryId) {

        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "Budget amount must be greater than zero"
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new RuntimeException("Category not found"));

        Budget budget = new Budget();

        budget.setAmount(amount);
        budget.setMonth(month);
        budget.setUser(user);
        budget.setCategory(category);

        return budgetRepository.save(budget);
    }

    public List<Budget> getAllBudgets() {
        return budgetRepository.findAll();
    }

    public String checkBudget(
            Long userId,
            Long categoryId,
            String month) {

        Budget budget =
                budgetRepository
                        .findByUserIdAndCategoryIdAndMonth(
                                userId,
                                categoryId,
                                month
                        )
                        .orElseThrow(() ->
                                new RuntimeException("Budget not found"));

        String[] parts = month.split("-");

        int year = Integer.parseInt(parts[0]);
        int monthNumber = Integer.parseInt(parts[1]);

        LocalDate start =
                LocalDate.of(year, monthNumber, 1);

        LocalDate end =
                start.withDayOfMonth(
                        start.lengthOfMonth()
                );

        List<Expense> expenses =
                expenseRepository
                        .findByUserIdAndCategoryIdAndDateBetween(
                                userId,
                                categoryId,
                                start,
                                end
                        );

        double totalSpent = expenses.stream()
                .mapToDouble(Expense::getAmount)
                .sum();

        double percentage =
                (totalSpent / budget.getAmount()) * 100;

        if (percentage >= 90) {

            return String.format(
                    "Warning: %.2f%% of budget used. Spent: ₹%.2f / ₹%.2f",
                    percentage,
                    totalSpent,
                    budget.getAmount()
            );
        }

        return String.format(
                "Budget status: %.2f%% used. Spent: ₹%.2f / ₹%.2f",
                percentage,
                totalSpent,
                budget.getAmount()
        );
    }
}