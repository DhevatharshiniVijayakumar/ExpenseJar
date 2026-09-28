package com.expenslar.expenslar.repository;

import com.expenslar.expenslar.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserId(Long userId);

    List<Expense> findByUserIdAndDateBetween(
            Long userId,
            LocalDate start,
            LocalDate end
    );

    List<Expense> findByUserIdAndCategoryIdAndDateBetween(
            Long userId,
            Long categoryId,
            LocalDate start,
            LocalDate end
    );
}