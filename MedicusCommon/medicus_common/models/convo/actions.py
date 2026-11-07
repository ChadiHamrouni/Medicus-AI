"""Action models for conversation UI actions.

This module provides Pydantic models for actionable UI elements that can be
rendered within conversation messages (buttons, links, navigation actions).

These actions are returned by AI tools and rendered by the frontend as
interactive elements in the chat interface.
"""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class ActionLink(BaseModel):
    """A navigational action link that can be rendered as a button in the conversation.

    When Sara returns this as part of a tool response, the frontend renders it
    as a clickable button/link within the message bubble.

    Example use cases:
    - "View Patient Health Profile" button
    - "Open Prescription" link
    - "Go to Appointment Details" action
    """

    action_type: Literal["navigate"] = Field(
        "navigate",
        description="Type of action - currently only 'navigate' is supported"
    )
    target: str = Field(
        ...,
        description="Target identifier (e.g., 'patient_health_profile', 'prescription_details')"
    )
    url: str = Field(
        ...,
        description="The URL/route to navigate to"
    )
    params: Dict[str, Any] = Field(
        default_factory=dict,
        description="URL parameters and context data"
    )
    label: str = Field(
        ...,
        description="Button/link label text shown to the user"
    )
    description: Optional[str] = Field(
        None,
        description="Optional description shown below the button"
    )
    icon: Optional[str] = Field(
        None,
        description="Optional icon name (e.g., 'health-profile', 'chart', 'document')"
    )

    model_config = ConfigDict(extra='forbid')


class ActionLinkResponse(BaseModel):
    """Response model for tools that return actionable UI elements.

    This wraps the ActionLink with additional context about the action.
    """

    success: bool = Field(
        True,
        description="Whether the action link was generated successfully"
    )
    message: str = Field(
        ...,
        description="Message to display alongside the action (Sara's text response)"
    )
    action_link: ActionLink = Field(
        ...,
        description="The action link to render in the UI"
    )
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional context data for the frontend"
    )

    model_config = ConfigDict(extra='forbid')