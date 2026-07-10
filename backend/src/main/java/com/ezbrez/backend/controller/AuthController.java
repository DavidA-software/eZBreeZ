package com.ezbrez.backend.controller;

import com.ezbrez.backend.model.User;
import com.ezbrez.backend.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public User signup(@RequestBody SignupRequest request) {
        return authService.signup(
                request.firstName(),
                request.lastName(),
                request.email(),
                request.password(),
                request.dateOfBirth()
        );
    }

    @PostMapping("/login")
    public User login(@RequestBody LoginRequest request) {
        return authService.login(request.email(), request.password());
    }

    public record SignupRequest(
            String firstName,
            String lastName,
            String email,
            String password,
            LocalDate dateOfBirth
    ) {}

    public record LoginRequest(
            String email,
            String password
    ) {}
}