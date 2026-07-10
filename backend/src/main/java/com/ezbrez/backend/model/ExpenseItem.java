package com.ezbrez.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "expense_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "budget_id", nullable = false)
    private Budget budget;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotNull
    @Column(name = "monthly_amount", nullable = false)
    private BigDecimal monthlyAmount;
}