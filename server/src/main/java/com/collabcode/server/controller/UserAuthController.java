package com.collabcode.server.controller;

import java.util.Collections;
import java.util.Map;

import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * This controller exposes an endpoint to return the currently authenticated user’s details.
 * The endpoint is available at /api/user-auth.
 */
@RestController
@RequestMapping("/api/user-auth")
public class UserAuthController {

    @GetMapping
    public Map<String, Object> getUserAuth(OAuth2AuthenticationToken authentication) {
        if (authentication != null) {
           
            return authentication.getPrincipal().getAttributes();
        } else {
           
            return Collections.emptyMap();
        }
    }
}
