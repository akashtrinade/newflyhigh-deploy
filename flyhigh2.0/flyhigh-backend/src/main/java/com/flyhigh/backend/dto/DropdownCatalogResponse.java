package com.flyhigh.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class DropdownCatalogResponse {

    private List<DropdownFieldResponse> fields = new ArrayList<>();
    private double commissionPercent = 20.0;

    public DropdownCatalogResponse() {}

    public DropdownCatalogResponse(List<DropdownFieldResponse> fields) {
        this.fields = fields;
    }

    public List<DropdownFieldResponse> getFields() { return fields; }
    public void setFields(List<DropdownFieldResponse> fields) { this.fields = fields; }

    public double getCommissionPercent() { return commissionPercent; }
    public void setCommissionPercent(double commissionPercent) { this.commissionPercent = commissionPercent; }
}
