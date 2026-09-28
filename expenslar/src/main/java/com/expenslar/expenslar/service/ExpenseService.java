package com.expenslar.expenslar.service;

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
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;

    public ExpenseService(
            ExpenseRepository expenseRepository,
            UserRepository userRepository,
            CategoryRepository categoryRepository,
            BudgetRepository budgetRepository) {

        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.budgetRepository = budgetRepository;
    }

    public String createExpense(
            double amount,
            LocalDate date,
            String description,
            Long userId,
            Long categoryId) {

        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "Expense amount must be greater than zero"
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new RuntimeException("Category not found"));

        Expense expense = new Expense();

        expense.setAmount(amount);
        expense.setDate(date);
        expense.setDescription(description);
        expense.setUser(user);
        expense.setCategory(category);

        expenseRepository.save(expense);

        String month = String.format(
                "%04d-%02d",
                date.getYear(),
                date.getMonthValue()
        );

        return checkBudgetAfterExpense(
                userId,
                categoryId,
                month
        );
    }

    private String checkBudgetAfterExpense(
            Long userId,
            Long categoryId,
            String month) {

        var budgetOptional =
                budgetRepository.findByUserIdAndCategoryIdAndMonth(
                        userId,
                        categoryId,
                        month
                );

        if (budgetOptional.isEmpty()) {
            return "Expense added successfully. No budget set for this category.";
        }

        var budget = budgetOptional.get();

        String[] parts = month.split("-");

        int year = Integer.parseInt(parts[0]);
        int monthNumber = Integer.parseInt(parts[1]);

        LocalDate start = LocalDate.of(year, monthNumber, 1);

        LocalDate end = start.withDayOfMonth(
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
                    "Expense added successfully. Warning: %.2f%% of budget used. Spent: ₹%.2f / ₹%.2f",
                    percentage,
                    totalSpent,
                    budget.getAmount()
            );
        }

        return String.format(
                "Expense added successfully. %.2f%% of budget used. Spent: ₹%.2f / ₹%.2f",
                percentage,
                totalSpent,
                budget.getAmount()
        );
    }

    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }

    public List<Expense> getUserExpenses(Long userId) {
        return expenseRepository.findByUserId(userId);
    }

    public List<Expense> getMonthlyExpenses(
            Long userId,
            int year,
            int month) {

        LocalDate start = LocalDate.of(year, month, 1);

        LocalDate end = start.withDayOfMonth(
                start.lengthOfMonth()
        );

        return expenseRepository.findByUserIdAndDateBetween(
                userId,
                start,
                end
        );
    }
}