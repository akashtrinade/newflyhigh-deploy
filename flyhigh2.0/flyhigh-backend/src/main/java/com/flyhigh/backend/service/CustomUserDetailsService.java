package com.flyhigh.backend.service;

import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Custom UserDetailsService for Spring Security authentication.
 *
 * Loads user from MongoDB by email and converts to Spring Security UserDetails.
 * Role is prefixed with "ROLE_" for Spring Security's hasRole() support.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Spring Security expects roles as "ROLE_CLIENT", "ROLE_EXPERT", etc.
        SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole());

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                user.getIsActive(),
                true, // account non-expired
                true, // credentials non-expired
                true, // account non-locked
                List.of(authority)
        );
    }
}
