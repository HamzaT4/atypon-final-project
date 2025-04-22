package com.collabcode.server.config;

import com.collabcode.server.entity.User;
import com.collabcode.server.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class CustomOAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomOAuth2AuthenticationSuccessHandler.class);

    @Autowired
    private UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {
        if (authentication instanceof OAuth2AuthenticationToken token) {
            Map<String, Object> attributes = token.getPrincipal().getAttributes();
            String githubId = String.valueOf(attributes.get("id"));
            String username = (String) attributes.get("login");
            String email = (String) attributes.getOrDefault("email", username + "@github.com");

            User user = userRepository.findById(githubId).orElse(null);
            if (user == null) {
                user = new User(githubId, username, email);
                userRepository.save(user);
                logger.info("Signup successful: New user created with username '{}' and GitHub ID '{}'", username, githubId);
            } else {
                logger.info("Login successful: Existing user '{}' (GitHub ID '{}') logged in", username, githubId);
            }
            response.sendRedirect("http://www.atypon-triaining-nov.online/");
        } else {
            response.sendRedirect("http://www.atypon-triaining-nov.online/");
        }
    }
}
