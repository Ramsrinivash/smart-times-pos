<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Single Session Policy: Revoke all previous tokens for this user so old devices get closed
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLog::log($user->id, 'LOGIN', 'Authentication', "User {$user->name} logged in successfully");

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        ActivityLog::log($user->id, 'LOGOUT', 'Authentication', "User {$user->name} logged out");
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function getUsers(Request $request)
    {
        $users = User::all();
        return response()->json($users);
    }

    public function addUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:admin,manager,sales',
            'base_salary' => 'nullable|numeric|min:0',
        ]);

        $salary = $request->has('base_salary') && $request->base_salary !== null && $request->base_salary !== ''
            ? (float)$request->base_salary
            : 0.00;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'base_salary' => $salary,
        ]);

        ActivityLog::log($request->user()->id, 'CREATE', 'Users', "Created staff account {$user->name} ({$user->role}) — Salary: ₹" . number_format($user->base_salary, 2));

        return response()->json($user, 201);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($request->user()->role !== 'admin' && $request->user()->id !== $user->id) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|in:admin,manager,sales',
            'base_salary' => 'nullable|numeric|min:0',
        ]);

        if ($request->has('base_salary') && $request->base_salary !== null && $request->base_salary !== '') {
            $user->base_salary = (float)$request->base_salary;
        }

        $user->fill($request->only(['name', 'email', 'role']));

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        ActivityLog::log($request->user()->id, 'UPDATE', 'Users', "Updated staff account {$user->name} — Salary: ₹" . number_format($user->base_salary, 2));

        return response()->json($user);
    }

    public function deleteUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own admin account.'], 400);
        }
        $name = $user->name;
        $user->delete();
        ActivityLog::log($request->user()->id, 'DELETE', 'Users', "Removed staff account {$name}");
        return response()->json(['message' => 'Staff account deleted successfully.']);
    }
}
