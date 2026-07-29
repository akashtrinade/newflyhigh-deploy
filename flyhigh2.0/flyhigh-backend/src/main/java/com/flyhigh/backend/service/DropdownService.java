package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.DropdownCatalogResponse;
import com.flyhigh.backend.dto.DropdownFieldResponse;
import com.flyhigh.backend.dto.DropdownOptionResponse;
import com.flyhigh.backend.model.DropdownDefinition;
import com.flyhigh.backend.model.DropdownOptionValue;
import com.flyhigh.backend.repository.DropdownDefinitionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class DropdownService {

    public static final String CATEGORY = "category";
    public static final String SUB_CATEGORY = "subCategory";
    public static final String LANGUAGES = "languages";

    private final DropdownDefinitionRepository dropdownDefinitionRepository;
    private final CountryService countryService;
    private final PricingService pricingService;

    public DropdownService(DropdownDefinitionRepository dropdownDefinitionRepository,
                           CountryService countryService,
                           PricingService pricingService) {
        this.dropdownDefinitionRepository = dropdownDefinitionRepository;
        this.countryService = countryService;
        this.pricingService = pricingService;
    }

    public DropdownCatalogResponse getExpertProfileDropdownCatalog() {
        List<DropdownFieldResponse> fields = new ArrayList<>(dropdownDefinitionRepository.findAllByOrderByDisplayOrderAsc()
                .stream()
                .filter(def -> !"country".equals(def.getKey()))
                .map(this::toResponse)
                .toList());

        // Merge in-memory countries at the first position (displayOrder=1)
        fields.add(0, buildCountryField());

        DropdownCatalogResponse response = new DropdownCatalogResponse(fields);
        response.setCommissionPercent(pricingService.getCommissionPercent());
        return response;
    }

    public void ensureDefaults() {
        saveIfMissing(createCategoryDefinition());
        saveIfMissing(createSubCategoryDefinition());
        saveIfMissing(createLanguageDefinition());
    }

    public void ensureCustomSubCategoryOption(String category, String subCategory) {
        String normalizedCategory = normalize(category);
        String normalizedSubCategory = normalize(subCategory);
        if (normalizedCategory == null || normalizedSubCategory == null) {
            return;
        }

        DropdownDefinition definition = dropdownDefinitionRepository.findByKey(SUB_CATEGORY).orElse(null);
        if (definition == null) {
            return;
        }

        boolean alreadyExists = definition.getOptions().stream().anyMatch(option ->
                sameValue(option.getParentValue(), normalizedCategory)
                        && sameValue(option.getValue(), normalizedSubCategory));
        if (alreadyExists) {
            return;
        }

        int nextSortOrder = definition.getOptions().stream()
                .filter(option -> sameValue(option.getParentValue(), normalizedCategory))
                .map(DropdownOptionValue::getSortOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0) + 1;

        DropdownOptionValue option = new DropdownOptionValue(normalizedSubCategory, normalizedSubCategory,
                normalizedCategory, nextSortOrder);
        option.setCustom(true);
        option.setActive(true);

        List<DropdownOptionValue> options = new ArrayList<>(definition.getOptions());
        options.add(option);
        definition.setOptions(options);
        definition.setUpdatedAt(Instant.now());
        dropdownDefinitionRepository.save(definition);
    }

    private void saveIfMissing(DropdownDefinition definition) {
        if (dropdownDefinitionRepository.findByKey(definition.getKey()).isPresent()) {
            return;
        }
        Instant now = Instant.now();
        definition.setCreatedAt(now);
        definition.setUpdatedAt(now);
        dropdownDefinitionRepository.save(definition);
    }

    private DropdownFieldResponse toResponse(DropdownDefinition definition) {
        DropdownFieldResponse response = new DropdownFieldResponse();
        response.setKey(definition.getKey());
        response.setLabel(definition.getLabel());
        response.setPlaceholder(definition.getPlaceholder());
        response.setAllowCustom(definition.getAllowCustom());
        response.setMultiSelect(definition.getMultiSelect());
        response.setDependsOn(definition.getDependsOn());
        response.setOptions(definition.getOptions().stream()
                .filter(option -> !Boolean.FALSE.equals(option.getActive()))
                .sorted(Comparator
                        .comparing((DropdownOptionValue option) -> option.getSortOrder() == null ? Integer.MAX_VALUE : option.getSortOrder())
                        .thenComparing(option -> option.getLabel() == null ? "" : option.getLabel()))
                .map(option -> new DropdownOptionResponse(
                        option.getValue(),
                        option.getLabel(),
                        option.getParentValue(),
                        option.getCustom()))
                .toList());
        return response;
    }

    private DropdownDefinition createCategoryDefinition() {
        return createDefinition(CATEGORY, "Expertise Category", "Select a category", false, false, null, 2, List.of(
                option("Technology & IT", 1),
                option("Business & Finance", 2),
                option("Health & Wellness", 3),
                option("Education & Career", 4),
                option("Legal & Compliance", 5),
                option("Marketing & Sales", 6),
                option("Creative & Design", 7),
                option("Engineering & Manufacturing", 8)
        ));
    }

    private DropdownDefinition createSubCategoryDefinition() {
        return createDefinition(SUB_CATEGORY, "Sub Category", "Select a sub category", true, false, CATEGORY, 3, List.of(
                option("Software Development", "Technology & IT", 1),
                option("Cloud & DevOps", "Technology & IT", 2),
                option("Data Science & AI", "Technology & IT", 3),
                option("Cybersecurity", "Technology & IT", 4),
                option("Product Management", "Technology & IT", 5),
                option("Financial Planning", "Business & Finance", 1),
                option("Accounting & Tax", "Business & Finance", 2),
                option("Investment Strategy", "Business & Finance", 3),
                option("Startup Advisory", "Business & Finance", 4),
                option("Operations", "Business & Finance", 5),
                option("Nutrition", "Health & Wellness", 1),
                option("Mental Wellness", "Health & Wellness", 2),
                option("Fitness Coaching", "Health & Wellness", 3),
                option("Preventive Care", "Health & Wellness", 4),
                option("Life Coaching", "Health & Wellness", 5),
                option("Career Guidance", "Education & Career", 1),
                option("Resume Review", "Education & Career", 2),
                option("Interview Preparation", "Education & Career", 3),
                option("Study Abroad", "Education & Career", 4),
                option("Skill Development", "Education & Career", 5),
                option("Corporate Law", "Legal & Compliance", 1),
                option("Contract Review", "Legal & Compliance", 2),
                option("Intellectual Property", "Legal & Compliance", 3),
                option("Regulatory Compliance", "Legal & Compliance", 4),
                option("Immigration", "Legal & Compliance", 5),
                option("Digital Marketing", "Marketing & Sales", 1),
                option("SEO & Content", "Marketing & Sales", 2),
                option("Brand Strategy", "Marketing & Sales", 3),
                option("Sales Coaching", "Marketing & Sales", 4),
                option("Market Research", "Marketing & Sales", 5),
                option("UI/UX Design", "Creative & Design", 1),
                option("Graphic Design", "Creative & Design", 2),
                option("Video Editing", "Creative & Design", 3),
                option("Copywriting", "Creative & Design", 4),
                option("Interior Design", "Creative & Design", 5),
                option("Mechanical Engineering", "Engineering & Manufacturing", 1),
                option("Electrical Engineering", "Engineering & Manufacturing", 2),
                option("Civil Engineering", "Engineering & Manufacturing", 3),
                option("Supply Chain", "Engineering & Manufacturing", 4),
                option("Quality Assurance", "Engineering & Manufacturing", 5)
        ));
    }

    private DropdownDefinition createLanguageDefinition() {
        return createDefinition(LANGUAGES, "Languages Spoken", "Select languages", false, true, null, 4, List.of(
                option("English", 1),
                option("Spanish", 2),
                option("French", 3),
                option("German", 4),
                option("Mandarin", 5),
                option("Arabic", 6),
                option("Hindi", 7),
                option("Portuguese", 8),
                option("Japanese", 9),
                option("Korean", 10),
                option("Russian", 11),
                option("Italian", 12),
                option("Dutch", 13),
                option("Turkish", 14),
                option("Vietnamese", 15),
                option("Thai", 16)
        ));
    }

    private DropdownDefinition createDefinition(String key, String label, String placeholder,
                                                boolean allowCustom, boolean multiSelect, String dependsOn,
                                                int displayOrder, List<DropdownOptionValue> options) {
        DropdownDefinition definition = new DropdownDefinition();
        definition.setKey(key);
        definition.setLabel(label);
        definition.setPlaceholder(placeholder);
        definition.setAllowCustom(allowCustom);
        definition.setMultiSelect(multiSelect);
        definition.setDependsOn(dependsOn);
        definition.setDisplayOrder(displayOrder);
        definition.setOptions(options);
        return definition;
    }

    private DropdownOptionValue option(String value, int sortOrder) {
        return new DropdownOptionValue(value, value, sortOrder);
    }

    private DropdownOptionValue option(String value, String parentValue, int sortOrder) {
        return new DropdownOptionValue(value, value, parentValue, sortOrder);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean sameValue(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return left.trim().toLowerCase(Locale.ROOT).equals(right.trim().toLowerCase(Locale.ROOT));
    }

    /**
     * Builds a synthetic country {@link DropdownFieldResponse} from the
     * in-memory {@link CountryService} cache instead of MongoDB.
     */
    private DropdownFieldResponse buildCountryField() {
        DropdownFieldResponse field = new DropdownFieldResponse();
        field.setKey("country");
        field.setLabel("Country");
        field.setPlaceholder("Select your country");
        field.setAllowCustom(false);
        field.setMultiSelect(false);
        field.setDependsOn(null);

        List<DropdownOptionResponse> options = new ArrayList<>();
        for (String name : countryService.getCountryNames()) {
            options.add(new DropdownOptionResponse(name, name, null, false));
        }
        field.setOptions(options);
        return field;
    }
}
