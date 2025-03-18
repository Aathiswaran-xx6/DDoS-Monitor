package com.ddosmonitor.service;

import com.ddosmonitor.model.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    private final List<User> users = new ArrayList<>();
    private final PasswordEncoder passwordEncoder;

    public UserService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void init() {
        // Initialize with default admin user
        users.add(new User("admin", passwordEncoder.encode("admin123"), "ADMIN"));
        
        // Initialize with some monitoring users
        users.add(new User("monitor1", passwordEncoder.encode("monitor123"), "USER"));
        users.add(new User("monitor2", passwordEncoder.encode("monitor123"), "USER"));
    }

    public Optional<User> findByUsername(String username) {
        return users.stream()
                .filter(user -> user.getUsername().equals(username))
                .findFirst();
    }
    
    public boolean authenticate(String username, String password) {
        Optional<User> userOpt = findByUsername(username);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return passwordEncoder.matches(password, user.getPassword());
        }
        
        return false;
    }
    
    public List<User> getAllUsers() {
        return new ArrayList<>(users);
    }
}