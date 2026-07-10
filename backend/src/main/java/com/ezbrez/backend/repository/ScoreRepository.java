package com.ezbrez.backend.repository;

import com.ezbrez.backend.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long> {

    // Spring derives the SQL query entirely from this method name:
    // SELECT * FROM scores WHERE user_id = ? ORDER BY created_at DESC;
    List<Score> findByUserIdOrderByCreatedAtDesc(Long userId);
}