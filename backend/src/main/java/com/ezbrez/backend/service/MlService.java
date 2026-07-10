package org.mcintyrelab.service;

import org.mcintyrelab.dto.MlRequest;
import com.ezbrez.backend.model.Score; // Reuses your inner response class from earlier!
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class MlService {

    private final WebClient webClient;

    public MlService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("http://localhost:8000").build();
    }

    public Score.HistoryResponse callMlModel(MlRequest request) {
        return this.webClient.post()
                .uri("/predict")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Score.HistoryResponse.class)
                .block(); // Blocks synchronously to return the score structure immediately
    }
}