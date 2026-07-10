package com.ezbrez.backend.service;

import com.ezbrez.backend.model.Score;
import com.ezbrez.backend.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ScoreService {

    private final ScoreRepository scoreRepository;

    public ScoreService(ScoreRepository scoreRepository) {
        this.scoreRepository = scoreRepository;
    }

    public List<Score.HistoryResponse> getHistoryByUserId(Long userId) {
        // Pipeline: Fetch from repo -> Stream entities -> Map to Inner DTO -> Collect to List
        return scoreRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(score -> new Score.HistoryResponse(
                        score.getId(),
                        score.getScore(),
                        score.getAmountSpent(),
                        score.getMlDecision(),
                        score.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
}