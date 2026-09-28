package com.expenslar.expenslar.controller;

import com.expenslar.expenslar.entity.Budget;
import com.expenslar.expenslar.service.BudgetService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @PostMapping
    public Budget createBudget(
            @RequestParam double amount,
            @RequestParam String month,
            @RequestParam Long userId,
            @RequestParam Long categoryId) {

        return budgetService.createBudget(
                amount,
                month,
                userId,
                categoryId
        );
    }

    @GetMapping
    public List<Budget> getAllBudgets() {
        return budgetService.getAllBudgets();
    }

    @GetMapping("/check")
    public String checkBudget(
            @RequestParam Long userId,
            @RequestParam Long categoryId,
            @RequestParam String month) {

        return budgetService.checkBudget(
                userId,
                categoryId,
                month
        );
    }
}