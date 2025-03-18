package com.ddosmonitor.controller;

import com.ddosmonitor.model.AuthRequest;
import com.ddosmonitor.model.AuthResponse;
import com.ddosmonitor.model.User;
import com.ddosmonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest) {
        boolean isAuthenticated = userService.authenticate(
                authRequest.getUsername(), 
                authRequest.getPassword()
        );
        
        if (isAuthenticated) {
            // Generate a simple token (in a real app, use JWT)
            String token = UUID.randomUUID().toString();
            
            return ResponseEntity.ok(new AuthResponse(token, authRequest.getUsername()));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }
    }
    
    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String token) {
        // In a real app, validate JWT token
        // For this demo, we'll just return OK if token exists
        if (token != null && !token.isEmpty()) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
} 