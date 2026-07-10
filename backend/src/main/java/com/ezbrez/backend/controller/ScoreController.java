package com.ezbrez.backend.controller;

import com.ezbrez.backend.model.Score;
import com.ezbrez.backend.service.ScoreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scores")
@CrossOrigin // Allows your frontend folder to hit this backend API
public class ScoreController {

    private final ScoreService scoreService;

    // Injecting the service layer instead of the repository directly
    public ScoreController(ScoreService scoreService) {
        this.scoreService = scoreService;
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<Score.HistoryResponse>> getUserScoreHistory(@PathVariable Long userId) {
        List<Score.HistoryResponse> historyList = scoreService.getHistoryByUserId(userId);
        return ResponseEntity.ok(historyList);
    }
}