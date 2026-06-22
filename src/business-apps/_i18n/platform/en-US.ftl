# Platform terminology — en-US
# Terms are the canonical Fluent source of truth.
# Message keys below are stable aliases so app code can still reference `platform-*`.

# Core terms
-platform-type =
    .label = Digital Workforce Platform
    .inline = digital workforce platform
    .label-plural = Digital Workforce Platforms
    .inline-plural = digital workforce platforms

-platform-enabler =
    .label = Enterprise AI
    .inline = Enterprise AI
    .label-plural = Enterprise AI
    .inline-plural = Enterprise AI

-platform-ai-agent-fleet =
    .label = Digital Workforce
    .inline = digital workforce
    .label-plural = Digital Workforces
    .inline-plural = digital workforces

-platform-ai-agent =
    .label = Digital Employee
    .inline = digital employee
    .label-plural = Digital Employees
    .inline-plural = digital employees

-platform-ai-agent-product =
    .label = Enterprise Agent Worker
    .inline = enterprise agent worker
    .label-plural = Enterprise Agent Workers
    .inline-plural = enterprise agent workers

-platform-ai-agent-network =
    .label = Agent Operating System
    .inline = agent operating system
    .label-plural = Agent Operating Systems
    .inline-plural = agent operating systems

-platform-domain-create =
    .label = AI Development Platform
    .inline = AI development platform
    .label-plural = AI Development Platforms
    .inline-plural = AI development platforms

-platform-domain-business =
    .label = Business Capability Platform
    .inline = business capability platform
    .label-plural = Business Capability Platforms
    .inline-plural = business capability platforms

-platform-domain-workplace =
    .label = Digital Workplace Platform
    .inline = digital workplace platform
    .label-plural = Digital Workplace Platforms
    .inline-plural = digital workplace platforms

-platform-business-capability-pack =
    .label = Business Capability Pack
    .inline = business capability pack
    .label-plural = Business Capability Packs
    .inline-plural = business capability packs

-platform-value-pack =
    .label = Value Pack
    .inline = Value Pack
    .label-plural = Value Packs
    .inline-plural = Value Packs

-platform-credit =
    .label = NEWWORK Credit
    .inline = NEWWORK Credit
    .label-plural = NEWWORK Credits
    .inline-plural = NEWWORK Credits

# Stable message aliases for direct usage
platform-type = { -platform-type.label }
platform-type-inline = { -platform-type.inline }
platform-type-count = { $count ->
    [one] { -platform-type.label }
   *[other] { -platform-type.label-plural }
}
platform-type-inline-count = { $count ->
    [one] { -platform-type.inline }
   *[other] { -platform-type.inline-plural }
}

platform-enabler = { -platform-enabler.label }
platform-enabler-inline = { -platform-enabler.inline }
platform-enabler-count = { $count ->
    [one] { -platform-enabler.label }
   *[other] { -platform-enabler.label-plural }
}
platform-enabler-inline-count = { $count ->
    [one] { -platform-enabler.inline }
   *[other] { -platform-enabler.inline-plural }
}

platform-ai-agent-fleet = { -platform-ai-agent-fleet.label }
platform-ai-agent-fleet-inline = { -platform-ai-agent-fleet.inline }
platform-ai-agent-fleet-count = { $count ->
    [one] { -platform-ai-agent-fleet.label }
   *[other] { -platform-ai-agent-fleet.label-plural }
}
platform-ai-agent-fleet-inline-count = { $count ->
    [one] { -platform-ai-agent-fleet.inline }
   *[other] { -platform-ai-agent-fleet.inline-plural }
}

platform-ai-agent = { -platform-ai-agent.label }
platform-ai-agent-inline = { -platform-ai-agent.inline }
platform-ai-agent-count = { $count ->
    [one] { -platform-ai-agent.label }
   *[other] { -platform-ai-agent.label-plural }
}
platform-ai-agent-inline-count = { $count ->
    [one] { -platform-ai-agent.inline }
   *[other] { -platform-ai-agent.inline-plural }
}

platform-ai-agent-product = { -platform-ai-agent-product.label }
platform-ai-agent-product-inline = { -platform-ai-agent-product.inline }
platform-ai-agent-product-count = { $count ->
    [one] { -platform-ai-agent-product.label }
   *[other] { -platform-ai-agent-product.label-plural }
}
platform-ai-agent-product-inline-count = { $count ->
    [one] { -platform-ai-agent-product.inline }
   *[other] { -platform-ai-agent-product.inline-plural }
}

platform-ai-agent-network = { -platform-ai-agent-network.label }
platform-ai-agent-network-inline = { -platform-ai-agent-network.inline }
platform-ai-agent-network-count = { $count ->
    [one] { -platform-ai-agent-network.label }
   *[other] { -platform-ai-agent-network.label-plural }
}
platform-ai-agent-network-inline-count = { $count ->
    [one] { -platform-ai-agent-network.inline }
   *[other] { -platform-ai-agent-network.inline-plural }
}

platform-domain-create = { -platform-domain-create.label }
platform-domain-create-inline = { -platform-domain-create.inline }
platform-domain-create-count = { $count ->
    [one] { -platform-domain-create.label }
   *[other] { -platform-domain-create.label-plural }
}
platform-domain-create-inline-count = { $count ->
    [one] { -platform-domain-create.inline }
   *[other] { -platform-domain-create.inline-plural }
}

platform-domain-business = { -platform-domain-business.label }
platform-domain-business-inline = { -platform-domain-business.inline }
platform-domain-business-count = { $count ->
    [one] { -platform-domain-business.label }
   *[other] { -platform-domain-business.label-plural }
}
platform-domain-business-inline-count = { $count ->
    [one] { -platform-domain-business.inline }
   *[other] { -platform-domain-business.inline-plural }
}

platform-domain-workplace = { -platform-domain-workplace.label }
platform-domain-workplace-inline = { -platform-domain-workplace.inline }
platform-domain-workplace-count = { $count ->
    [one] { -platform-domain-workplace.label }
   *[other] { -platform-domain-workplace.label-plural }
}
platform-domain-workplace-inline-count = { $count ->
    [one] { -platform-domain-workplace.inline }
   *[other] { -platform-domain-workplace.inline-plural }
}

platform-business-capability-pack = { -platform-business-capability-pack.label }
platform-business-capability-pack-inline = { -platform-business-capability-pack.inline }
platform-business-capability-pack-count = { $count ->
    [one] { -platform-business-capability-pack.label }
   *[other] { -platform-business-capability-pack.label-plural }
}
platform-business-capability-pack-inline-count = { $count ->
    [one] { -platform-business-capability-pack.inline }
   *[other] { -platform-business-capability-pack.inline-plural }
}

platform-value-pack = { -platform-value-pack.label }
platform-value-pack-inline = { -platform-value-pack.inline }
platform-value-pack-count = { $count ->
    [one] { -platform-value-pack.label }
   *[other] { -platform-value-pack.label-plural }
}
platform-value-pack-inline-count = { $count ->
    [one] { -platform-value-pack.inline }
   *[other] { -platform-value-pack.inline-plural }
}

platform-credit = { -platform-credit.label }
platform-credit-inline = { -platform-credit.inline }
platform-credit-count = { $count ->
    [one] { -platform-credit.label }
   *[other] { -platform-credit.label-plural }
}
platform-credit-inline-count = { $count ->
    [one] { -platform-credit.inline }
   *[other] { -platform-credit.inline-plural }
}

# Reusable claim lines
platform-enabler-claim = Powered by { -platform-enabler.label }
platform-type-claim = NEWWORK is the { -platform-type.label } for the enterprise.
platform-differentiation-claim = Not another agent framework. The operating environment for governed { -platform-ai-agent.inline-plural }.
platform-ai-agent-network-claim = The { -platform-ai-agent-network.label } coordinates { -platform-ai-agent.inline-plural }, humans, workflows, policies, and enterprise systems.
platform-transformation-claim = From systems of record to systems of intelligence.
platform-knowledge-claim = Operating Mind of the Enterprise
platform-governance-claim = Every { -platform-ai-agent.inline } has a role, owner, permissions, policy scope, workflow boundaries, and an audit trail.
platform-business-significance-pricing-claim = Price the value of operated { -platform-business-capability-pack.inline-plural }, not raw AI consumption.
platform-credit-claim = Credits control usage; { -platform-business-capability-pack.inline } defines price.
