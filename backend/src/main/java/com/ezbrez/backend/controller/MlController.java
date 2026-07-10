package org.mcintyrelab.controller;

import org.mcintyrelab.dto.MlRequest;
import com.ezbrez.backend.model.Score;
import org.mcintyrelab.service.MlService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ml")
@CrossOrigin // Allows your React code to seamlessly hit this controller
public class MlController {

    private final MlService mlService;

    public MlController(MlService mlService) {
        this.mlService = mlService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<Score.HistoryResponse> analyzeDecision(@RequestBody MlRequest request) {
        try {
            Score.HistoryResponse result = mlService.callMlModel(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Safe fallback if the ML server goes offline or errors out mid-hackathon
            return ResponseEntity.status(500).build();
        }
    }
}