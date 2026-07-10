package com.ezbrez.backend.repository;

import com.ezbrez.backend.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    Optional<Budget> findByUserId(Long userId);
}