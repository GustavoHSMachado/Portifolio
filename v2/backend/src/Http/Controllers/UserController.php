<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Models\User;
use App\Support\Validator;

final class UserController
{
    public function __construct(private readonly User $users)
    {
    }

    public function me(Request $request): Response
    {
        $user = $this->users->findById((int) $request->userId());

        if ($user === null) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        return Response::ok(User::toPublic($user));
    }

    public function updateProfile(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'name'  => 'required|min:3|max:120',
            'phone' => 'required|digits|between:10,13',
        ])->validated();

        $userId = (int) $request->userId();
        $this->users->updateProfile($userId, $data['name'], $data['phone']);

        return Response::ok(
            User::toPublic($this->users->findById($userId) ?? []),
            'Dados atualizados.'
        );
    }
}
