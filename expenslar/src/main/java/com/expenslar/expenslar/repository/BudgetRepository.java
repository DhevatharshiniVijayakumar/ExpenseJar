package com.expenslar.expenslar.repository;

import com.expenslar.expenslar.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    Optional<Budget> findByUserIdAndCategoryIdAndMonth(
            Long userId,
            Long categoryId,
            String month
    );
}