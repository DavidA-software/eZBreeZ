package org.mcintyrelab.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@RestController
@RequestMapping("/api/bree")
@CrossOrigin // Keeps React happy
public class BreeAiController {

    private final RestTemplate restTemplate = new RestTemplate();

    // Point this to your teammate's local Python server endpoint
    private final String PYTHON_ML_URL = "http://localhost:8000/api/bree/chat";

    @PostMapping("/chat")
    public Map<String, Object> chatWithBree(@RequestBody Map<String, Object> payload) {
        try {
            // Forward the payload (message, username, budget) straight to Python
            Map<String, Object> pythonResponse = restTemplate.postForObject(PYTHON_ML_URL, payload, Map.class);
            return pythonResponse;
        } catch (Exception e) {
            // Fallback if your teammate's Python server goes offline mid-hackathon
            return Map.of("reply", "Bree AI is updating her gears right now. Make sure the Python server is running!");
        }
    }
}