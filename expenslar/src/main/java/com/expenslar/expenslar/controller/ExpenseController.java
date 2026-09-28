package com.expenslar.expenslar.controller;

import com.expenslar.expenslar.service.ExpenseService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping
    public String createExpense(
            @RequestParam double amount,
            @RequestParam LocalDate date,
            @RequestParam String description,
            @RequestParam Long userId,
            @RequestParam Long categoryId) {

        return expenseService.createExpense(
                amount,
                date,
                description,
                userId,
                categoryId
        );
    }

    @GetMapping
    public List<com.expenslar.expenslar.entity.Expense> getAllExpenses() {
        return expenseService.getAllExpenses();
    }

    @GetMapping("/user/{userId}")
    public List<com.expenslar.expenslar.entity.Expense> getUserExpenses(
            @PathVariable Long userId) {

        return expenseService.getUserExpenses(userId);
    }

    @GetMapping("/monthly")
    public List<com.expenslar.expenslar.entity.Expense> getMonthlyExpenses(
            @RequestParam Long userId,
            @RequestParam int year,
            @RequestParam int month) {

        return expenseService.getMonthlyExpenses(
                userId,
                year,
                month
        );
    }
}